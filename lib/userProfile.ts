import { prisma } from "@/lib/db";

export async function upsertUserProfile(userId: string, email: string | null) {
  return prisma.userProfile.upsert({
    where: { id: userId },
    create: { id: userId, email },
    update: email === null ? {} : { email },
  });
}
