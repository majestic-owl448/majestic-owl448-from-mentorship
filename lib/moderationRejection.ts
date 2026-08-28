import type { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/db";
import {
  ProposalAlreadyDecidedError,
  ProposalNotFoundError,
} from "@/lib/moderationApproval";
import type { ModerationProposalType } from "@/lib/moderationProposals";

type Transaction = Prisma.TransactionClient;

async function claimRejection(
  tx: Transaction,
  proposalType: ModerationProposalType,
  proposalId: string,
  moderatorId: string,
  decisionNote: string,
  decidedAt: Date,
) {
  const data = {
    status: "REJECTED" as const,
    moderatedById: moderatorId,
    decidedAt,
    decisionNote,
  };
  const result = await (proposalType === "NAMED_DEFINITION"
    ? tx.namedFaceValueDefinitionProposal.updateMany({
        where: { id: proposalId, status: "PENDING" },
        data,
      })
    : proposalType === "NAMED_VALUE"
      ? tx.namedFaceValueValueProposal.updateMany({
          where: { id: proposalId, status: "PENDING" },
          data,
        })
      : tx.currencyConversionProposal.updateMany({
          where: { id: proposalId, status: "PENDING" },
          data,
        }));
  if (result.count === 1) return;

  const proposal =
    proposalType === "NAMED_DEFINITION"
      ? await tx.namedFaceValueDefinitionProposal.findUnique({
          where: { id: proposalId },
          select: { status: true },
        })
      : proposalType === "NAMED_VALUE"
        ? await tx.namedFaceValueValueProposal.findUnique({
            where: { id: proposalId },
            select: { status: true },
          })
        : await tx.currencyConversionProposal.findUnique({
            where: { id: proposalId },
            select: { status: true },
          });
  if (!proposal) throw new ProposalNotFoundError();
  throw new ProposalAlreadyDecidedError();
}

async function markReferencedInventory(
  tx: Transaction,
  proposalType: ModerationProposalType,
  proposalId: string,
) {
  if (proposalType === "NAMED_DEFINITION") {
    const proposal = await tx.namedFaceValueDefinitionProposal.findUniqueOrThrow({
      where: { id: proposalId },
      select: { submittedById: true },
    });
    const stamps = await tx.stampInventoryEntry.findMany({
      where: {
        userId: proposal.submittedById,
        namedFaceValueProposalId: proposalId,
      },
      select: { id: true },
    });
    if (stamps.length > 0) {
      await tx.stampProposalAction.createMany({
        data: stamps.map(({ id: stampId }) => ({
          stampId,
          namedDefinitionProposalId: proposalId,
        })),
      });
    }
    await tx.namedFaceValueValueProposal.updateMany({
      where: {
        submittedById: proposal.submittedById,
        definitionProposalId: proposalId,
      },
      data: { actionRequired: true },
    });
    return;
  }

  if (proposalType === "NAMED_VALUE") {
    const proposal = await tx.namedFaceValueValueProposal.findUniqueOrThrow({
      where: { id: proposalId },
      select: {
        submittedById: true,
        namedFaceValueId: true,
        definitionProposalId: true,
      },
    });
    const stamps = await tx.stampInventoryEntry.findMany({
      where: {
        userId: proposal.submittedById,
        ...(proposal.namedFaceValueId
          ? { namedFaceValueId: proposal.namedFaceValueId }
          : { namedFaceValueProposalId: proposal.definitionProposalId }),
      },
      select: { id: true },
    });
    if (stamps.length > 0) {
      await tx.stampProposalAction.createMany({
        data: stamps.map(({ id: stampId }) => ({
          stampId,
          namedValueProposalId: proposalId,
        })),
      });
    }
    return;
  }

  const proposal = await tx.currencyConversionProposal.findUniqueOrThrow({
    where: { id: proposalId },
    select: {
      submittedById: true,
      fromCurrencyCode: true,
      toCurrencyCode: true,
    },
  });
  const matchingPostalEntities = await tx.userPostalEntitySetting.findMany({
    where: {
      userId: proposal.submittedById,
      displayCurrencyCode: proposal.toCurrencyCode,
    },
    select: { postalEntityId: true },
  });
  const stamps = await tx.stampInventoryEntry.findMany({
    where: {
      userId: proposal.submittedById,
      postalEntityId: {
        in: matchingPostalEntities.map(({ postalEntityId }) => postalEntityId),
      },
      OR: [
        {
          faceValueType: "MONETARY",
          faceCurrencyCode: proposal.fromCurrencyCode,
        },
        {
          faceValueType: "NAMED",
          OR: [
            {
              namedFaceValue: {
                valueSchedule: {
                  currencyCode: proposal.fromCurrencyCode,
                },
              },
            },
            {
              namedFaceValueProposal: {
                currencyCode: proposal.fromCurrencyCode,
              },
            },
          ],
        },
        { manualPostageCurrencyCode: proposal.fromCurrencyCode },
      ],
    },
    select: { id: true },
  });
  if (stamps.length > 0) {
    await tx.stampProposalAction.createMany({
      data: stamps.map(({ id: stampId }) => ({
        stampId,
        currencyConversionProposalId: proposalId,
      })),
    });
  }
}

export async function rejectModerationProposal(
  proposalType: ModerationProposalType,
  proposalId: string,
  moderatorId: string,
  decisionNote: string,
  decidedAt = new Date(),
) {
  await prisma.$transaction(async (tx) => {
    await claimRejection(
      tx,
      proposalType,
      proposalId,
      moderatorId,
      decisionNote,
      decidedAt,
    );
    await markReferencedInventory(tx, proposalType, proposalId);
  });
}
