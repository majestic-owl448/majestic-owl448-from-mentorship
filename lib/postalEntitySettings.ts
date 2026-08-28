import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/db";

export type PostalEntitySettingValues = {
  displayCurrencyCode: string;
  timeZone: string;
  timeZoneMode: "SYSTEM" | "CUSTOM";
};

export type NewPostalEntitySettingInput = PostalEntitySettingValues & {
  postalEntityName: string;
  normalizedPostalEntityName: string;
  countryCode: string;
  issuingAuthority?: string;
  scope?: string;
  sourceUrl?: string | null;
  sourceNote?: string | null;
};

export type PostalEntitySubmissionInput = {
  postalEntityName: string;
  normalizedPostalEntityName: string;
  countryCode: string;
  issuingAuthority: string;
  scope: string;
  sourceUrl: string | null;
  sourceNote: string | null;
};

export class PostalEntitySettingAlreadyExistsError extends Error {
  constructor(message = "A setting for this postal entity already exists.") {
    super(message);
    this.name = "PostalEntitySettingAlreadyExistsError";
  }
}

export class PostalEntitySettingNotFoundError extends Error {
  constructor() {
    super("The postal entity setting was not found.");
    this.name = "PostalEntitySettingNotFoundError";
  }
}

export class PostalEntityUnavailableError extends Error {
  constructor() {
    super("The postal entity is not available to this user.");
    this.name = "PostalEntityUnavailableError";
  }
}

export class PostalEntitySettingRequiredError extends Error {
  constructor() {
    super("Complete the required postal entity settings before using inventory.");
    this.name = "PostalEntitySettingRequiredError";
  }
}

const settingWithEntity = {
  postalEntity: true,
} satisfies Prisma.UserPostalEntitySettingInclude;

function isAvailableEntity(userId: string) {
  return {
    OR: [
      { status: "APPROVED" as const },
      { status: "PENDING" as const, submittedById: userId },
    ],
  };
}

function isUniqueConstraintError(caught: unknown) {
  return (
    caught instanceof Prisma.PrismaClientKnownRequestError &&
    caught.code === "P2002"
  );
}

export function localDateInTimeZone(timeZone: string, instant = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return `${values.year}-${values.month}-${values.day}`;
}

export async function listPostalEntitySettings(userId: string) {
  return prisma.userPostalEntitySetting.findMany({
    where: { userId },
    include: settingWithEntity,
    orderBy: [{ postalEntity: { name: "asc" } }, { createdAt: "asc" }],
  });
}

export async function requireActivePostalEntitySetting(userId: string) {
  const profile = await prisma.userProfile.findFirst({
    where: {
      id: userId,
      activePostalEntitySetting: {
        userId,
        postalEntity: isAvailableEntity(userId),
      },
    },
    select: {
      activePostalEntitySetting: {
        include: settingWithEntity,
      },
    },
  });

  if (!profile?.activePostalEntitySetting) {
    throw new PostalEntitySettingRequiredError();
  }

  return profile.activePostalEntitySetting;
}

export async function createPostalEntitySetting(
  userId: string,
  input: NewPostalEntitySettingInput
) {
  return prisma.$transaction(async (transaction) => {
    const postalEntity = await transaction.postalEntity.create({
      data: {
        name: input.postalEntityName,
        normalizedName: input.normalizedPostalEntityName,
        countryCode: input.countryCode,
        issuingAuthority: input.issuingAuthority ?? "",
        scope: input.scope ?? "",
        sourceUrl: input.sourceUrl ?? null,
        sourceNote: input.sourceNote ?? null,
        submittedName: input.postalEntityName,
        submittedNormalizedName: input.normalizedPostalEntityName,
        submittedCountryCode: input.countryCode,
        submittedIssuingAuthority: input.issuingAuthority ?? "",
        submittedScope: input.scope ?? "",
        submittedSourceUrl: input.sourceUrl ?? null,
        submittedSourceNote: input.sourceNote ?? null,
        submittedById: userId,
      },
    });

    const setting = await transaction.userPostalEntitySetting.create({
      data: {
        userId,
        postalEntityId: postalEntity.id,
        displayCurrencyCode: input.displayCurrencyCode,
        timeZone: input.timeZone,
        timeZoneMode: input.timeZoneMode,
      },
      include: settingWithEntity,
    });

    await transaction.userProfile.updateMany({
      where: { id: userId, activePostalEntitySettingId: null },
      data: { activePostalEntitySettingId: setting.id },
    });

    return setting;
  });
}

export async function addExistingPostalEntitySetting(
  userId: string,
  postalEntityId: string,
  input: PostalEntitySettingValues
) {
  const postalEntity = await prisma.postalEntity.findFirst({
    where: {
      id: postalEntityId,
      ...isAvailableEntity(userId),
    },
    select: { id: true },
  });

  if (!postalEntity) {
    throw new PostalEntityUnavailableError();
  }

  try {
    return await prisma.$transaction(async (transaction) => {
      const setting = await transaction.userPostalEntitySetting.create({
        data: { userId, postalEntityId, ...input },
        include: settingWithEntity,
      });
      await transaction.userProfile.updateMany({
        where: { id: userId, activePostalEntitySettingId: null },
        data: { activePostalEntitySettingId: setting.id },
      });
      return setting;
    });
  } catch (caught) {
    if (isUniqueConstraintError(caught)) {
      throw new PostalEntitySettingAlreadyExistsError();
    }
    throw caught;
  }
}

export async function updatePostalEntitySetting(
  userId: string,
  settingId: string,
  input: PostalEntitySettingValues
) {
  const update = await prisma.userPostalEntitySetting.updateMany({
    where: {
      id: settingId,
      userId,
      postalEntity: isAvailableEntity(userId),
    },
    data: input,
  });

  if (update.count !== 1) {
    throw new PostalEntitySettingNotFoundError();
  }

  return prisma.userPostalEntitySetting.findUniqueOrThrow({
    where: { id: settingId },
    include: settingWithEntity,
  });
}

export async function activatePostalEntitySetting(
  userId: string,
  settingId: string
) {
  const setting = await prisma.userPostalEntitySetting.findFirst({
    where: {
      id: settingId,
      userId,
      postalEntity: isAvailableEntity(userId),
    },
    include: settingWithEntity,
  });

  if (!setting) {
    throw new PostalEntitySettingNotFoundError();
  }

  await prisma.userProfile.update({
    where: { id: userId },
    data: { activePostalEntitySettingId: setting.id },
  });

  return setting;
}

export const createInitialPostalEntitySetting = createPostalEntitySetting;

export async function listAvailablePostalEntities(userId: string) {
  return prisma.postalEntity.findMany({
    where: isAvailableEntity(userId),
    orderBy: [{ countryCode: "asc" }, { name: "asc" }, { id: "asc" }],
  });
}

export async function replaceRejectedPostalEntity(
  userId: string,
  settingId: string,
  replacement: { postalEntityId: string } | { submission: PostalEntitySubmissionInput },
) {
  return prisma.$transaction(async (transaction) => {
    const setting = await transaction.userPostalEntitySetting.findFirst({
      where: {
        id: settingId,
        userId,
        postalEntity: { status: "REJECTED", submittedById: userId },
      },
      include: { postalEntity: true },
    });
    if (!setting) throw new PostalEntitySettingNotFoundError();

    const replacementEntity = "postalEntityId" in replacement
      ? await transaction.postalEntity.findFirst({
          where: {
            id: replacement.postalEntityId,
            ...isAvailableEntity(userId),
          },
        })
      : await transaction.postalEntity.create({
          data: {
            name: replacement.submission.postalEntityName,
            normalizedName: replacement.submission.normalizedPostalEntityName,
            countryCode: replacement.submission.countryCode,
            issuingAuthority: replacement.submission.issuingAuthority,
            scope: replacement.submission.scope,
            sourceUrl: replacement.submission.sourceUrl,
            sourceNote: replacement.submission.sourceNote,
            submittedName: replacement.submission.postalEntityName,
            submittedNormalizedName:
              replacement.submission.normalizedPostalEntityName,
            submittedCountryCode: replacement.submission.countryCode,
            submittedIssuingAuthority:
              replacement.submission.issuingAuthority,
            submittedScope: replacement.submission.scope,
            submittedSourceUrl: replacement.submission.sourceUrl,
            submittedSourceNote: replacement.submission.sourceNote,
            submittedById: userId,
          },
        });
    if (!replacementEntity) throw new PostalEntityUnavailableError();

    const duplicate = await transaction.userPostalEntitySetting.findUnique({
      where: {
        userId_postalEntityId: {
          userId,
          postalEntityId: replacementEntity.id,
        },
      },
    });
    if (duplicate && duplicate.id !== setting.id) {
      throw new PostalEntitySettingAlreadyExistsError(
        "A setting for the replacement postal entity already exists.",
      );
    }

    await transaction.stampInventoryEntry.updateMany({
      where: { userId, postalEntityId: setting.postalEntityId },
      data: {
        postalEntityId: replacementEntity.id,
        countryCode: replacementEntity.countryCode,
      },
    });
    return transaction.userPostalEntitySetting.update({
      where: { id: setting.id },
      data: { postalEntityId: replacementEntity.id },
      include: settingWithEntity,
    });
  });
}
