import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/db";
import {
  ProposalAlreadyDecidedError,
  ProposalNotFoundError,
} from "@/lib/moderationApproval";
import {
  MergeInputError,
  MergeTargetError,
} from "@/lib/moderationMerge";
import { validatePostalEntitySubmission } from "@/lib/postalEntitySettingValidation";

type Transaction = Prisma.TransactionClient;

export class PostalEntityCorrectionError extends Error {
  readonly errors: Record<string, string>;

  constructor(errors: Record<string, string>) {
    super("Correct the postal entity fields.");
    this.name = "PostalEntityCorrectionError";
    this.errors = errors;
  }
}

function correctedFields(input: unknown) {
  const validation = validatePostalEntitySubmission(input);
  if (validation.errors) {
    throw new PostalEntityCorrectionError(validation.errors);
  }
  return validation.data;
}

async function claim(
  tx: Transaction,
  proposalId: string,
  status: "APPROVED" | "REJECTED" | "MERGED",
  moderatorId: string,
  decisionNote: string,
  decidedAt: Date,
) {
  const result = await tx.postalEntity.updateMany({
    where: { id: proposalId, status: "PENDING" },
    data: { status, moderatedById: moderatorId, decisionNote, decidedAt },
  });
  if (result.count === 1) return;
  const entity = await tx.postalEntity.findUnique({
    where: { id: proposalId },
    select: { id: true },
  });
  if (!entity) throw new ProposalNotFoundError();
  throw new ProposalAlreadyDecidedError();
}

export async function approvePostalEntity(
  proposalId: string,
  moderatorId: string,
  decisionNote: string,
  correctedInput: unknown,
  decidedAt = new Date(),
) {
  const corrected = correctedFields(correctedInput);
  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe("PRAGMA defer_foreign_keys = ON");
    await claim(tx, proposalId, "APPROVED", moderatorId, decisionNote, decidedAt);
    const entity = await tx.postalEntity.findUniqueOrThrow({
      where: { id: proposalId },
    });
    await tx.postalEntity.update({
      where: { id: entity.id },
      data: {
        name: corrected.postalEntityName,
        normalizedName: corrected.normalizedPostalEntityName,
        countryCode: corrected.countryCode,
        issuingAuthority: corrected.issuingAuthority,
        scope: corrected.scope,
        sourceUrl: corrected.sourceUrl,
        sourceNote: corrected.sourceNote,
      },
    });
    if (entity.countryCode !== corrected.countryCode) {
      await tx.stampInventoryEntry.updateMany({
        where: {
          userId: entity.submittedById ?? undefined,
          postalEntityId: entity.id,
        },
        data: { countryCode: corrected.countryCode },
      });
    }
  });
}

export async function mergePostalEntity(
  proposalId: string,
  targetId: string,
  moderatorId: string,
  decisionNote: string,
  decidedAt = new Date(),
) {
  if (!targetId.trim()) {
    throw new MergeInputError("Select a canonical postal entity.");
  }
  await prisma.$transaction(async (tx) => {
    await claim(tx, proposalId, "MERGED", moderatorId, decisionNote, decidedAt);
    const [proposal, target] = await Promise.all([
      tx.postalEntity.findUniqueOrThrow({ where: { id: proposalId } }),
      tx.postalEntity.findFirst({
        where: { id: targetId.trim(), status: "APPROVED" },
      }),
    ]);
    if (!target || target.id === proposal.id) {
      throw new MergeTargetError(
        "Select an approved canonical postal entity.",
      );
    }
    const proposerId = proposal.submittedById;
    if (proposerId) {
      await tx.stampInventoryEntry.updateMany({
        where: { userId: proposerId, postalEntityId: proposal.id },
        data: { postalEntityId: target.id, countryCode: target.countryCode },
      });
      const [sourceSetting, targetSetting] = await Promise.all([
        tx.userPostalEntitySetting.findUnique({
          where: { userId_postalEntityId: { userId: proposerId, postalEntityId: proposal.id } },
        }),
        tx.userPostalEntitySetting.findUnique({
          where: { userId_postalEntityId: { userId: proposerId, postalEntityId: target.id } },
        }),
      ]);
      if (sourceSetting && targetSetting) {
        await tx.userProfile.updateMany({
          where: { id: proposerId, activePostalEntitySettingId: targetSetting.id },
          data: { activePostalEntitySettingId: sourceSetting.id },
        });
        await tx.userPostalEntitySetting.delete({ where: { id: targetSetting.id } });
        await tx.userPostalEntitySetting.update({
          where: { id: sourceSetting.id },
          data: { postalEntityId: target.id },
        });
      } else if (sourceSetting) {
        await tx.userPostalEntitySetting.update({
          where: { id: sourceSetting.id },
          data: { postalEntityId: target.id },
        });
      }
    }
    await tx.postalEntity.update({
      where: { id: proposal.id },
      data: { mergedIntoId: target.id },
    });
  });
}

export async function rejectPostalEntity(
  proposalId: string,
  moderatorId: string,
  decisionNote: string,
  decidedAt = new Date(),
) {
  await prisma.$transaction((tx) =>
    claim(tx, proposalId, "REJECTED", moderatorId, decisionNote, decidedAt),
  );
}
