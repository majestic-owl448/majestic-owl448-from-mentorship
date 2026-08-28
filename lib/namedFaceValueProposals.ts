import { prisma } from "@/lib/db";
import type {
  DefinitionProposalInput,
  ValueProposalInput,
} from "@/lib/namedFaceValueProposalValidation";

export class ProposalTargetError extends Error {
  constructor(
    field:
      | "targetNamedFaceValueId"
      | "definitionProposalId"
      | "replacesRejectedProposalId",
    message = "Select a named definition available to you.",
  ) {
    super(message);
    this.name = "ProposalTargetError";
    this.field = field;
  }

  field:
    | "targetNamedFaceValueId"
    | "definitionProposalId"
    | "replacesRejectedProposalId";
}

export async function createDefinitionProposal(
  userId: string,
  input: DefinitionProposalInput,
) {
  if (input.targetNamedFaceValueId) {
    const target = await prisma.namedFaceValue.findUnique({
      where: { id: input.targetNamedFaceValueId },
      select: { id: true },
    });
    if (!target) {
      throw new ProposalTargetError("targetNamedFaceValueId");
    }
  }

  return prisma.$transaction(async (tx) => {
    const rejected = input.replacesRejectedProposalId
      ? await tx.namedFaceValueDefinitionProposal.findFirst({
          where: {
            id: input.replacesRejectedProposalId,
            submittedById: userId,
            status: "REJECTED",
          },
          select: { id: true, countryCode: true },
        })
      : null;
    if (input.replacesRejectedProposalId && !rejected) {
      throw new ProposalTargetError(
        "replacesRejectedProposalId",
        "Select one of your rejected definitions to correct.",
      );
    }
    if (rejected && rejected.countryCode !== input.countryCode) {
      throw new ProposalTargetError(
        "replacesRejectedProposalId",
        "A corrected definition must keep the stamp country. Submit a new proposal and replace affected references separately.",
      );
    }

    const proposal = await tx.namedFaceValueDefinitionProposal.create({
      data: {
        submittedById: userId,
        targetNamedFaceValueId: input.targetNamedFaceValueId,
        countryCode: input.countryCode,
        displayCode: input.displayCode,
        normalizedCode: input.normalizedCode,
        currencyCode: input.currencyCode,
        sourceUrl: input.sourceUrl,
        sourceNote: input.sourceNote,
      },
    });
    if (rejected) {
      await tx.stampInventoryEntry.updateMany({
        where: {
          userId,
          namedFaceValueProposalId: rejected.id,
        },
        data: { namedFaceValueProposalId: proposal.id },
      });
      await tx.stampProposalAction.updateMany({
        where: {
          resolvedAt: null,
          stamp: { userId },
          namedDefinitionProposalId: rejected.id,
        },
        data: {
          resolvedAt: new Date(),
          resolution: `RESUBMITTED:${proposal.id}`,
        },
      });
    }
    return proposal;
  });
}

export async function createValueProposal(
  userId: string,
  input: ValueProposalInput,
  localDate: string,
) {
  return prisma.$transaction(async (tx) => {
    if (input.targetNamedFaceValueId) {
      const target = await tx.namedFaceValue.findUnique({
        where: { id: input.targetNamedFaceValueId },
        select: { id: true },
      });
      if (!target) {
        throw new ProposalTargetError("targetNamedFaceValueId");
      }
    } else {
      const target = await tx.namedFaceValueDefinitionProposal.updateMany({
        where: {
          id: input.definitionProposalId as string,
          submittedById: userId,
          status: "PENDING",
        },
        data: { status: "PENDING" },
      });
      if (target.count !== 1) {
        throw new ProposalTargetError("definitionProposalId");
      }
    }

    const proposal = await tx.namedFaceValueValueProposal.create({
      data: {
        submittedById: userId,
        namedFaceValueId: input.targetNamedFaceValueId,
        definitionProposalId: input.definitionProposalId,
        amount: input.amount,
        effectiveOn: input.effectiveOn,
        eligibleOn: input.effectiveOn ?? localDate,
        sourceUrl: input.sourceUrl,
        sourceNote: input.sourceNote,
      },
    });
    await tx.stampProposalAction.updateMany({
      where: {
        resolvedAt: null,
        stamp: { userId },
        namedValueProposal: {
          is: {
            submittedById: userId,
            ...(input.targetNamedFaceValueId
              ? { namedFaceValueId: input.targetNamedFaceValueId }
              : { definitionProposalId: input.definitionProposalId }),
            effectiveOn: input.effectiveOn,
          },
        },
      },
      data: { resolvedAt: new Date(), resolution: "RESUBMITTED" },
    });
    return proposal;
  });
}

export async function listUserNamedFaceValueProposals(userId: string) {
  const [definitions, values] = await Promise.all([
    prisma.namedFaceValueDefinitionProposal.findMany({
      where: { submittedById: userId },
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
        decidedAt: true,
        decisionNote: true,
        createdAt: true,
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    }),
    prisma.namedFaceValueValueProposal.findMany({
      where: { submittedById: userId },
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
        decidedAt: true,
        decisionNote: true,
        actionRequired: true,
        createdAt: true,
        namedFaceValue: {
          select: {
            valueSchedule: { select: { currencyCode: true } },
          },
        },
        definitionProposal: { select: { currencyCode: true } },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    }),
  ]);

  return {
    definitions: definitions.map((proposal) => ({
      ...proposal,
      proposalType: "DEFINITION" as const,
      createdAt: proposal.createdAt.toISOString(),
    })),
    values: values.map(
      ({ namedFaceValue, definitionProposal, ...proposal }) => ({
        ...proposal,
        proposalType: "VALUE" as const,
        currencyCode:
          namedFaceValue?.valueSchedule.currencyCode ??
          definitionProposal?.currencyCode,
        createdAt: proposal.createdAt.toISOString(),
      }),
    ),
  };
}
