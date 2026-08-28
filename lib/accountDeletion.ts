import supertokens from "supertokens-node";
import Session from "supertokens-node/recipe/session";
import type { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/db";

export class AccountDeletionNotFoundError extends Error {
  constructor() {
    super("Account not found.");
    this.name = "AccountDeletionNotFoundError";
  }
}

export class AccountDeletionIncompleteError extends Error {
  constructor() {
    super("Account deletion is queued for retry.");
    this.name = "AccountDeletionIncompleteError";
  }
}

export type AccountIdentityDeletion = {
  revokeSessions: (userId: string) => Promise<unknown>;
  deleteIdentity: (userId: string) => Promise<unknown>;
};

const superTokensIdentityDeletion: AccountIdentityDeletion = {
  revokeSessions: (userId) => Session.revokeAllSessionsForUser(userId),
  deleteIdentity: (userId) => supertokens.deleteUser(userId),
};

type Transaction = Prisma.TransactionClient;

function redactAccountText(
  value: string | null,
  identifiers: string[],
): string | null {
  if (value === null) return null;
  return identifiers.reduce(
    (result, identifier) =>
      result.replaceAll(new RegExp(escapeRegExp(identifier), "giu"), "[deleted account]"),
    value,
  );
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function anonymizePreservedRecords(
  tx: Transaction,
  userId: string,
  email: string | null,
) {
  const identifiers = [userId, email].filter(
    (value): value is string => value !== null && value.length > 0,
  );
  const [postalEntities, definitions, values, conversions] = await Promise.all([
    tx.postalEntity.findMany({
      where: {
        OR: [
          {
            submittedById: userId,
            status: { in: ["APPROVED", "MERGED"] },
          },
          { moderatedById: userId },
        ],
      },
    }),
    tx.namedFaceValueDefinitionProposal.findMany({
      where: {
        OR: [
          {
            submittedById: userId,
            status: { in: ["APPROVED", "MERGED"] },
          },
          { moderatedById: userId },
        ],
      },
    }),
    tx.namedFaceValueValueProposal.findMany({
      where: {
        OR: [
          {
            submittedById: userId,
            status: { in: ["APPROVED", "MERGED"] },
          },
          { moderatedById: userId },
        ],
      },
    }),
    tx.currencyConversionProposal.findMany({
      where: {
        OR: [
          {
            submittedById: userId,
            status: { in: ["APPROVED", "MERGED"] },
          },
          { moderatedById: userId },
        ],
      },
    }),
  ]);

  await Promise.all([
    ...postalEntities.map((record) =>
      tx.postalEntity.update({
        where: { id: record.id },
        data: {
          submittedById: record.submittedById === userId ? null : undefined,
          moderatedById: record.moderatedById === userId ? null : undefined,
          sourceUrl: redactAccountText(record.sourceUrl, identifiers),
          sourceNote: redactAccountText(record.sourceNote, identifiers),
          submittedSourceUrl: redactAccountText(
            record.submittedSourceUrl,
            identifiers,
          ),
          submittedSourceNote: redactAccountText(
            record.submittedSourceNote,
            identifiers,
          ),
          decisionNote: redactAccountText(record.decisionNote, identifiers),
        },
      }),
    ),
    ...definitions.map((record) =>
      tx.namedFaceValueDefinitionProposal.update({
        where: { id: record.id },
        data: {
          submittedById: record.submittedById === userId ? null : undefined,
          moderatedById: record.moderatedById === userId ? null : undefined,
          sourceUrl: redactAccountText(record.sourceUrl, identifiers),
          sourceNote: redactAccountText(record.sourceNote, identifiers),
          decisionNote: redactAccountText(record.decisionNote, identifiers),
        },
      }),
    ),
    ...values.map((record) =>
      tx.namedFaceValueValueProposal.update({
        where: { id: record.id },
        data: {
          submittedById: record.submittedById === userId ? null : undefined,
          moderatedById: record.moderatedById === userId ? null : undefined,
          sourceUrl: redactAccountText(record.sourceUrl, identifiers),
          sourceNote: redactAccountText(record.sourceNote, identifiers),
          decisionNote: redactAccountText(record.decisionNote, identifiers),
        },
      }),
    ),
    ...conversions.map((record) =>
      tx.currencyConversionProposal.update({
        where: { id: record.id },
        data: {
          submittedById: record.submittedById === userId ? null : undefined,
          moderatedById: record.moderatedById === userId ? null : undefined,
          sourceUrl: redactAccountText(record.sourceUrl, identifiers),
          sourceNote: redactAccountText(record.sourceNote, identifiers),
          decisionNote: redactAccountText(record.decisionNote, identifiers),
        },
      }),
    ),
  ]);
}

async function deletePrivateAccountData(
  tx: Transaction,
  userId: string,
  email: string | null,
) {
  await tx.stampInventoryEntry.deleteMany({ where: { userId } });
  await tx.userPostalEntitySetting.deleteMany({ where: { userId } });

  await tx.namedFaceValueValueProposal.deleteMany({
    where: { submittedById: userId, status: { in: ["PENDING", "REJECTED"] } },
  });
  await tx.namedFaceValueDefinitionProposal.deleteMany({
    where: { submittedById: userId, status: { in: ["PENDING", "REJECTED"] } },
  });
  await tx.currencyConversionProposal.deleteMany({
    where: { submittedById: userId, status: { in: ["PENDING", "REJECTED"] } },
  });
  await tx.postalEntity.deleteMany({
    where: { submittedById: userId, status: { in: ["PENDING", "REJECTED"] } },
  });

  await anonymizePreservedRecords(tx, userId, email);
  await Promise.all([
    tx.postalEntity.updateMany({
      where: { moderatedById: userId },
      data: { moderatedById: null },
    }),
    tx.namedFaceValueDefinitionProposal.updateMany({
      where: { moderatedById: userId },
      data: { moderatedById: null },
    }),
    tx.namedFaceValueValueProposal.updateMany({
      where: { moderatedById: userId },
      data: { moderatedById: null },
    }),
    tx.currencyConversionProposal.updateMany({
      where: { moderatedById: userId },
      data: { moderatedById: null },
    }),
  ]);
}

export async function isAccountDeletionPending(userId: string) {
  return (
    (await prisma.accountDeletionJob.findUnique({
      where: { userId },
      select: { userId: true },
    })) !== null
  );
}

export async function createAccountDeletionJob(userId: string) {
  return prisma.$transaction(async (tx) => {
    const profile = await tx.userProfile.findUnique({ where: { id: userId } });
    const existingJob = await tx.accountDeletionJob.findUnique({
      where: { userId },
    });
    if (!profile && !existingJob) throw new AccountDeletionNotFoundError();

    const job = await tx.accountDeletionJob.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });
    if (profile && profile.deletingAt === null) {
      await tx.userProfile.update({
        where: { id: userId },
        data: { deletingAt: new Date() },
      });
    }
    return job;
  });
}

export async function processAccountDeletionJob(
  userId: string,
  identityDeletion: AccountIdentityDeletion = superTokensIdentityDeletion,
) {
  const job = await prisma.accountDeletionJob.findUnique({ where: { userId } });
  if (!job) throw new AccountDeletionNotFoundError();

  await prisma.accountDeletionJob.update({
    where: { userId },
    data: { attemptCount: { increment: 1 }, status: "PENDING", lastError: null },
  });

  try {
    await identityDeletion.revokeSessions(userId);
    const profile = await prisma.userProfile.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    await prisma.$transaction((tx) =>
      deletePrivateAccountData(tx, userId, profile?.email ?? null),
    );
    await identityDeletion.deleteIdentity(userId);
    await prisma.$transaction(async (tx) => {
      await tx.userProfile.deleteMany({ where: { id: userId } });
      await tx.accountDeletionJob.deleteMany({ where: { userId } });
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown deletion error";
    await prisma.accountDeletionJob.updateMany({
      where: { userId },
      data: { status: "FAILED", lastError: message.slice(0, 2000) },
    });
    throw new AccountDeletionIncompleteError();
  }
}

export async function deleteAccount(
  userId: string,
  identityDeletion: AccountIdentityDeletion = superTokensIdentityDeletion,
) {
  await createAccountDeletionJob(userId);
  await processAccountDeletionJob(userId, identityDeletion);
}
