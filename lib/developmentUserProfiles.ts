import { prisma } from "@/lib/db";
import {
  DEVELOPMENT_USERS,
  type developmentUser,
} from "@/lib/developmentAuth";

type DevelopmentUser = NonNullable<ReturnType<typeof developmentUser>>;

export function upsertDevelopmentUserProfile(user: DevelopmentUser) {
  return prisma.userProfile.upsert({
    where: { id: user.id },
    create: {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    update: {
      email: user.email,
      role: user.role,
      deletingAt: null,
    },
  });
}

export async function seedDevelopmentUsers() {
  await prisma.$transaction(async (tx) => {
    await tx.stampProposalAction.deleteMany();
    await tx.stampInventoryEntry.deleteMany();
    await tx.userPostalEntitySetting.deleteMany();
    await tx.namedFaceValueValueProposal.deleteMany();
    await tx.namedFaceValueDefinitionProposal.deleteMany();
    await tx.namedFaceValue.deleteMany();
    await tx.valueScheduleValue.deleteMany();
    await tx.valueSchedule.deleteMany();
    await tx.currencyConversionProposal.deleteMany();
    await tx.currencyConversion.deleteMany();
    await tx.postalEntity.deleteMany();
    await tx.accountDeletionJob.deleteMany();
    await tx.deletedAccountTombstone.deleteMany();
    await tx.userProfile.deleteMany();
    await tx.currency.deleteMany();
    await tx.userProfile.createMany({
      data: Object.values(DEVELOPMENT_USERS).map(({ id, email, role }) => ({
        id,
        email,
        role,
      })),
    });
  });
}
