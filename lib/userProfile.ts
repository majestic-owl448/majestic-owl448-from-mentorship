import { prisma } from "@/lib/db";
import { isAccountDeletionPending } from "@/lib/accountDeletion";

export class AccountAccessBlockedError extends Error {
  constructor() {
    super("Account deletion is in progress.");
    this.name = "AccountAccessBlockedError";
  }
}

export async function upsertUserProfile(userId: string, email: string | null) {
  if (await isAccountDeletionPending(userId)) {
    throw new AccountAccessBlockedError();
  }
  return prisma.userProfile.upsert({
    where: { id: userId },
    create: { id: userId, email },
    update: email === null ? {} : { email },
  });
}
