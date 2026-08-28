import type { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/db";
import type { ModerationProposalType } from "@/lib/moderationProposals";

export class ApprovalInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApprovalInputError";
  }
}

export class ProposalNotFoundError extends Error {
  constructor() {
    super("Proposal not found.");
    this.name = "ProposalNotFoundError";
  }
}

export class ProposalAlreadyDecidedError extends Error {
  constructor() {
    super("Only pending proposals can be approved.");
    this.name = "ProposalAlreadyDecidedError";
  }
}

export class ApprovalTargetError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApprovalTargetError";
  }
}

export function validateDecisionNote(value: unknown): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ApprovalInputError("Enter a decision note.");
  }
  const note = value.trim();
  if (note.length > 2000) {
    throw new ApprovalInputError(
      "Decision notes must be 2,000 characters or fewer.",
    );
  }
  return note;
}

type Transaction = Prisma.TransactionClient;

async function claimDefinition(
  tx: Transaction,
  proposalId: string,
  moderatorId: string,
  decisionNote: string,
  decidedAt: Date,
) {
  const result = await tx.namedFaceValueDefinitionProposal.updateMany({
    where: { id: proposalId, status: "PENDING" },
    data: {
      status: "APPROVED",
      moderatedById: moderatorId,
      decidedAt,
      decisionNote,
    },
  });
  if (result.count === 1) return;
  const proposal = await tx.namedFaceValueDefinitionProposal.findUnique({
    where: { id: proposalId },
    select: { status: true },
  });
  if (!proposal) throw new ProposalNotFoundError();
  throw new ProposalAlreadyDecidedError();
}

async function approveDefinition(
  tx: Transaction,
  proposalId: string,
  moderatorId: string,
  decisionNote: string,
  decidedAt: Date,
) {
  await claimDefinition(tx, proposalId, moderatorId, decisionNote, decidedAt);
  const proposal = await tx.namedFaceValueDefinitionProposal.findUniqueOrThrow({
    where: { id: proposalId },
  });

  let namedFaceValueId: string;
  if (proposal.targetNamedFaceValueId) {
    const target = await tx.namedFaceValue.findUnique({
      where: { id: proposal.targetNamedFaceValueId },
      select: { id: true, valueScheduleId: true },
    });
    if (!target) {
      throw new ApprovalTargetError("The approved definition no longer exists.");
    }
    await tx.valueSchedule.update({
      where: { id: target.valueScheduleId },
      data: {
        countryCode: proposal.countryCode,
        currencyCode: proposal.currencyCode,
      },
    });
    const updated = await tx.namedFaceValue.update({
      where: { id: target.id },
      data: {
        displayCode: proposal.displayCode,
        normalizedCode: proposal.normalizedCode,
      },
    });
    namedFaceValueId = updated.id;
  } else {
    const schedule = await tx.valueSchedule.create({
      data: {
        countryCode: proposal.countryCode,
        currencyCode: proposal.currencyCode,
      },
    });
    const created = await tx.namedFaceValue.create({
      data: {
        countryCode: proposal.countryCode,
        displayCode: proposal.displayCode,
        normalizedCode: proposal.normalizedCode,
        valueScheduleId: schedule.id,
      },
    });
    namedFaceValueId = created.id;
  }

  await tx.namedFaceValueDefinitionProposal.update({
    where: { id: proposal.id },
    data: { approvedNamedFaceValueId: namedFaceValueId },
  });
}

async function claimValue(
  tx: Transaction,
  proposalId: string,
  moderatorId: string,
  decisionNote: string,
  decidedAt: Date,
) {
  const result = await tx.namedFaceValueValueProposal.updateMany({
    where: { id: proposalId, status: "PENDING" },
    data: {
      status: "APPROVED",
      moderatedById: moderatorId,
      decidedAt,
      decisionNote,
    },
  });
  if (result.count === 1) return;
  const proposal = await tx.namedFaceValueValueProposal.findUnique({
    where: { id: proposalId },
    select: { status: true },
  });
  if (!proposal) throw new ProposalNotFoundError();
  throw new ProposalAlreadyDecidedError();
}

async function approveValue(
  tx: Transaction,
  proposalId: string,
  moderatorId: string,
  decisionNote: string,
  decidedAt: Date,
) {
  await claimValue(tx, proposalId, moderatorId, decisionNote, decidedAt);
  const proposal = await tx.namedFaceValueValueProposal.findUniqueOrThrow({
    where: { id: proposalId },
    include: {
      definitionProposal: {
        select: { approvedNamedFaceValueId: true },
      },
    },
  });
  const namedFaceValueId =
    proposal.namedFaceValueId ??
    proposal.definitionProposal?.approvedNamedFaceValueId;
  if (!namedFaceValueId) {
    throw new ApprovalTargetError(
      "Approve the linked named definition before approving its value.",
    );
  }
  const namedFaceValue = await tx.namedFaceValue.findUnique({
    where: { id: namedFaceValueId },
    select: { valueScheduleId: true },
  });
  if (!namedFaceValue) {
    throw new ApprovalTargetError("The approved named definition no longer exists.");
  }

  const existing = await tx.valueScheduleValue.findFirst({
    where: {
      valueScheduleId: namedFaceValue.valueScheduleId,
      effectiveOn: proposal.effectiveOn,
    },
    orderBy: { createdAt: "asc" },
  });
  if (existing) {
    await tx.valueScheduleValue.update({
      where: { id: existing.id },
      data: { amount: proposal.amount },
    });
  } else {
    await tx.valueScheduleValue.create({
      data: {
        valueScheduleId: namedFaceValue.valueScheduleId,
        amount: proposal.amount,
        effectiveOn: proposal.effectiveOn,
      },
    });
  }
}

async function claimConversion(
  tx: Transaction,
  proposalId: string,
  moderatorId: string,
  decisionNote: string,
  decidedAt: Date,
) {
  const result = await tx.currencyConversionProposal.updateMany({
    where: { id: proposalId, status: "PENDING" },
    data: {
      status: "APPROVED",
      moderatedById: moderatorId,
      decidedAt,
      decisionNote,
    },
  });
  if (result.count === 1) return;
  const proposal = await tx.currencyConversionProposal.findUnique({
    where: { id: proposalId },
    select: { status: true },
  });
  if (!proposal) throw new ProposalNotFoundError();
  throw new ProposalAlreadyDecidedError();
}

async function approveConversion(
  tx: Transaction,
  proposalId: string,
  moderatorId: string,
  decisionNote: string,
  decidedAt: Date,
) {
  await claimConversion(tx, proposalId, moderatorId, decisionNote, decidedAt);
  const proposal = await tx.currencyConversionProposal.findUniqueOrThrow({
    where: { id: proposalId },
  });
  const data = {
    fromCurrencyCode: proposal.fromCurrencyCode,
    toCurrencyCode: proposal.toCurrencyCode,
    multiplier: proposal.multiplier,
  };
  if (proposal.targetCurrencyConversionId) {
    const target = await tx.currencyConversion.findUnique({
      where: { id: proposal.targetCurrencyConversionId },
      select: { id: true },
    });
    if (!target) {
      throw new ApprovalTargetError("The approved conversion no longer exists.");
    }
    await tx.currencyConversion.update({ where: { id: target.id }, data });
  } else {
    await tx.currencyConversion.create({ data });
  }
}

export async function approveModerationProposal(
  proposalType: ModerationProposalType,
  proposalId: string,
  moderatorId: string,
  decisionNote: string,
  decidedAt = new Date(),
) {
  await prisma.$transaction(async (tx) => {
    switch (proposalType) {
      case "NAMED_DEFINITION":
        await approveDefinition(
          tx,
          proposalId,
          moderatorId,
          decisionNote,
          decidedAt,
        );
        return;
      case "NAMED_VALUE":
        await approveValue(
          tx,
          proposalId,
          moderatorId,
          decisionNote,
          decidedAt,
        );
        return;
      case "FIXED_CONVERSION":
        await approveConversion(
          tx,
          proposalId,
          moderatorId,
          decisionNote,
          decidedAt,
        );
    }
  });
}
