import { prisma } from "@/lib/db";
import type {
  DefinitionProposalInput,
  ValueProposalInput,
} from "@/lib/namedFaceValueProposalValidation";

export class ProposalTargetError extends Error {
  constructor(field: "targetNamedFaceValueId" | "definitionProposalId") {
    super("Select a named definition available to you.");
    this.name = "ProposalTargetError";
    this.field = field;
  }

  field: "targetNamedFaceValueId" | "definitionProposalId";
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

  return prisma.namedFaceValueDefinitionProposal.create({
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
}

export async function createValueProposal(
  userId: string,
  input: ValueProposalInput,
  localDate: string,
) {
  if (input.targetNamedFaceValueId) {
    const target = await prisma.namedFaceValue.findUnique({
      where: { id: input.targetNamedFaceValueId },
      select: { id: true },
    });
    if (!target) {
      throw new ProposalTargetError("targetNamedFaceValueId");
    }
  } else {
    const target = await prisma.namedFaceValueDefinitionProposal.findFirst({
      where: {
        id: input.definitionProposalId as string,
        submittedById: userId,
        status: "PENDING",
      },
      select: { id: true },
    });
    if (!target) {
      throw new ProposalTargetError("definitionProposalId");
    }
  }

  return prisma.$transaction(async (tx) => {
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
    values: values.map((proposal) => ({
      ...proposal,
      proposalType: "VALUE" as const,
      createdAt: proposal.createdAt.toISOString(),
    })),
  };
}
