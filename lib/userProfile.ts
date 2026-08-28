import { prisma } from "@/lib/db";
import { accountDeletionHash } from "@/lib/accountDeletion";

export class AccountAccessBlockedError extends Error {
  constructor() {
    super("Account deletion is in progress.");
    this.name = "AccountAccessBlockedError";
  }
}

export async function upsertUserProfile(userId: string, email: string | null) {
  return prisma.$transaction(async (tx) => {
    const [deletionJob, tombstone] = await Promise.all([
      tx.accountDeletionJob.findUnique({
        where: { userId },
        select: { userId: true },
      }),
      tx.deletedAccountTombstone.findUnique({
        where: { userIdHash: accountDeletionHash(userId) },
        select: { userIdHash: true },
      }),
    ]);
    if (deletionJob || tombstone) throw new AccountAccessBlockedError();

    return tx.userProfile.upsert({
      where: { id: userId },
      create: { id: userId, email },
      update: email === null ? {} : { email },
    });
  });
}
