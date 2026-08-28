import type { StampInventoryEntry } from "@/lib/generated/prisma/client";
import { Prisma } from "@/lib/generated/prisma/client";
import { resolveCurrencyConversion } from "@/lib/currencyConversion";
import { prisma } from "@/lib/db";
import { addExactDecimals, multiplyExactDecimals } from "@/lib/decimal";
import {
  resolveNamedFaceValueById,
  resolveNamedFaceValueProposalById,
  type NamedFaceValueResolution,
} from "@/lib/namedFaceValue";
import { localDateInTimeZone } from "@/lib/postalEntitySettings";
import type { NewStampInput } from "@/lib/stampValidation";
import type { StampUpdateInput } from "@/lib/stampUpdateValidation";

type ActiveCountry = {
  displayCurrencyCode: string;
  timeZone: string;
  postalEntity: { countryCode: string };
};

type ResolvedValue = {
  amount: string;
  currencyCode: string;
  source:
    | "FACE_AMOUNT"
    | "FIXED_CONVERSION"
    | "PENDING_CONVERSION_PROPOSAL"
    | "NAMED_SCHEDULE"
    | "MANUAL_FALLBACK"
    | "EXPIRED"
    | "OUTSIDE_ACTIVE_COUNTRY";
};

type StampWithPostalEntity = Prisma.StampInventoryEntryGetPayload<{
  include: {
    postalEntity: true;
    namedFaceValue: true;
    namedFaceValueProposal: true;
  };
}>;

export class StampPostalEntityError extends Error {
  constructor() {
    super("Select a postal entity that belongs to the stamp country.");
    this.name = "StampPostalEntityError";
  }
}

export class StampNamedFaceValueError extends Error {
  constructor() {
    super("Select a named face value available for the stamp country.");
    this.name = "StampNamedFaceValueError";
  }
}

export class StampNotFoundError extends Error {
  constructor() {
    super("Stamp not found.");
    this.name = "StampNotFoundError";
  }
}

export class StampActionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StampActionError";
  }
}

async function resolveUnitPostageValue(
  stamp: StampInventoryEntry,
  activeCountry: ActiveCountry,
  namedValue: NamedFaceValueResolution | null,
): Promise<ResolvedValue | null> {
  if (stamp.countryCode !== activeCountry.postalEntity.countryCode) {
    return {
      amount: "0",
      currencyCode: activeCountry.displayCurrencyCode,
      source: "OUTSIDE_ACTIVE_COUNTRY",
    };
  }
  if (stamp.expired) {
    return {
      amount: "0",
      currencyCode: activeCountry.displayCurrencyCode,
      source: "EXPIRED",
    };
  }

  if (
    stamp.faceValueType === "MONETARY" &&
    stamp.faceAmount &&
    stamp.faceCurrencyCode
  ) {
    const conversion = await resolveCurrencyConversion(
      stamp.faceAmount,
      stamp.faceCurrencyCode,
      activeCountry.displayCurrencyCode,
      stamp.userId,
    );
    if (conversion.status === "RESOLVED") {
      return {
        amount: conversion.amount.toFixed(),
        currencyCode: conversion.currencyCode,
        source:
          conversion.source === "IDENTITY"
            ? "FACE_AMOUNT"
            : conversion.source === "PENDING_PROPOSAL"
              ? "PENDING_CONVERSION_PROPOSAL"
              : "FIXED_CONVERSION",
      };
    }
  }

  if (stamp.faceValueType === "NAMED" && namedValue) {
    if (namedValue.status === "RESOLVED") {
      const conversion = await resolveCurrencyConversion(
        namedValue.amount.toFixed(),
        namedValue.currencyCode,
        activeCountry.displayCurrencyCode,
        stamp.userId,
      );
      if (conversion.status === "RESOLVED") {
        return {
          amount: conversion.amount.toFixed(),
          currencyCode: conversion.currencyCode,
          source: "NAMED_SCHEDULE",
        };
      }
    }
  }

  if (stamp.manualPostageAmount && stamp.manualPostageCurrencyCode) {
    const fallbackConversion = await resolveCurrencyConversion(
      stamp.manualPostageAmount,
      stamp.manualPostageCurrencyCode,
      activeCountry.displayCurrencyCode,
      stamp.userId,
    );
    if (fallbackConversion.status === "RESOLVED") {
      return {
        amount: fallbackConversion.amount.toFixed(),
        currencyCode: fallbackConversion.currencyCode,
        source: "MANUAL_FALLBACK",
      };
    }
  }

  return null;
}

async function presentStampRecord(
  stamp: StampWithPostalEntity,
  activeCountry: ActiveCountry,
) {
  const namedValue =
    stamp.faceValueType !== "NAMED"
      ? null
      : stamp.namedFaceValueId
        ? await resolveNamedFaceValueById(
            stamp.namedFaceValueId,
            stamp.countryCode,
            localDateInTimeZone(activeCountry.timeZone),
            stamp.userId,
          )
        : stamp.namedFaceValueProposalId
          ? await resolveNamedFaceValueProposalById(
              stamp.namedFaceValueProposalId,
              stamp.countryCode,
              localDateInTimeZone(activeCountry.timeZone),
              stamp.userId,
            )
          : null;
  const availableFallback = await resolveUnitPostageValue(
    stamp,
    activeCountry,
    namedValue,
  );
  const unitPostageValue = stamp.actionRequired ? null : availableFallback;
  const usableQuantity = stamp.expired
    ? 0
    : stamp.quantityOwned - stamp.quantityAnnulled;
  const totalPostageValue =
    usableQuantity === 0
      ? {
          amount: "0",
          currencyCode: activeCountry.displayCurrencyCode,
        }
      : unitPostageValue
        ? {
            amount: multiplyExactDecimals(
              unitPostageValue.amount,
              usableQuantity.toString(),
            ),
            currencyCode: unitPostageValue.currencyCode,
          }
        : null;

  return {
    id: stamp.id,
    countryCode: stamp.countryCode,
    postalEntityId: stamp.postalEntityId,
    postalEntity: {
      id: stamp.postalEntity.id,
      name: stamp.postalEntity.name,
      countryCode: stamp.postalEntity.countryCode,
    },
    name: stamp.name,
    yearOfIssue: stamp.yearOfIssue,
    faceAmount: stamp.faceAmount,
    faceCurrencyCode: stamp.faceCurrencyCode,
    faceValueType: stamp.faceValueType,
    namedFaceValueId: stamp.namedFaceValueId,
    namedFaceValueProposalId: stamp.namedFaceValueProposalId,
    namedFaceValue: stamp.namedFaceValue
      ? {
          id: stamp.namedFaceValue.id,
          countryCode: stamp.namedFaceValue.countryCode,
          displayCode: stamp.namedFaceValue.displayCode,
        }
      : stamp.namedFaceValueProposal
        ? {
            id: stamp.namedFaceValueProposal.id,
            countryCode: stamp.namedFaceValueProposal.countryCode,
            displayCode: stamp.namedFaceValueProposal.displayCode,
            proposalStatus: stamp.namedFaceValueProposal.status,
          }
        : null,
    upcomingNamedFaceValue:
      namedValue && "upcoming" in namedValue && namedValue.upcoming
        ? {
            amount: namedValue.upcoming.amount.toFixed(),
            currencyCode: namedValue.upcoming.currencyCode,
            effectiveOn: namedValue.upcoming.effectiveOn,
            daysUntil: namedValue.upcoming.daysUntil,
          }
        : null,
    manualPostageAmount: stamp.manualPostageAmount,
    manualPostageCurrencyCode: stamp.manualPostageCurrencyCode,
    quantityOwned: stamp.quantityOwned,
    quantityAnnulled: stamp.quantityAnnulled,
    usableQuantity,
    expired: stamp.expired,
    actionRequired: stamp.actionRequired,
    availableFallback: stamp.actionRequired ? availableFallback : null,
    unitPostageValue,
    totalPostageValue,
    valuation: stamp.actionRequired
      ? { status: "ACTION_REQUIRED" as const, source: null }
      : unitPostageValue
      ? { status: "RESOLVED" as const, source: unitPostageValue.source }
      : { status: "UNRESOLVED" as const, source: null },
    createdAt: stamp.createdAt.toISOString(),
    updatedAt: stamp.updatedAt.toISOString(),
  };
}

export function calculateInventoryTotal(
  stamps: Awaited<ReturnType<typeof presentStampRecord>>[],
  currencyCode: string,
) {
  return {
    amount: stamps.reduce(
      (total, stamp) =>
        stamp.totalPostageValue
          ? addExactDecimals(total, stamp.totalPostageValue.amount)
          : total,
      "0",
    ),
    currencyCode,
  };
}

export async function createStamp(
  userId: string,
  input: NewStampInput,
) {
  const availableEntity = await prisma.userPostalEntitySetting.findFirst({
    where: {
      userId,
      postalEntityId: input.postalEntityId,
      postalEntity: {
        countryCode: input.countryCode,
        status: "PENDING",
        submittedById: userId,
      },
    },
    select: { id: true },
  });
  if (!availableEntity) {
    throw new StampPostalEntityError();
  }

  if (input.faceValueType === "NAMED") {
    const availableNamedFaceValue = input.namedFaceValueId
      ? await prisma.namedFaceValue.findUnique({
          where: {
            id_countryCode: {
              id: input.namedFaceValueId,
              countryCode: input.countryCode,
            },
          },
          select: { id: true },
        })
      : await prisma.namedFaceValueDefinitionProposal.findFirst({
          where: {
            id: input.namedFaceValueProposalId as string,
            countryCode: input.countryCode,
            submittedById: userId,
            status: "PENDING",
          },
          select: { id: true },
        });
    if (!availableNamedFaceValue) {
      throw new StampNamedFaceValueError();
    }
  }

  return prisma.stampInventoryEntry.create({
    data: { userId, ...input },
    include: {
      postalEntity: true,
      namedFaceValue: true,
      namedFaceValueProposal: true,
    },
  });
}

export async function listStamps(
  userId: string,
  activeCountry: ActiveCountry,
) {
  const stamps = await prisma.stampInventoryEntry.findMany({
    where: { userId },
    include: {
      postalEntity: true,
      namedFaceValue: true,
      namedFaceValueProposal: true,
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });

  return Promise.all(
    stamps.map((stamp) => presentStampRecord(stamp, activeCountry)),
  );
}

export async function updateStamp(
  userId: string,
  stampId: string,
  input: StampUpdateInput,
  activeCountry: ActiveCountry,
) {
  const stamp = await prisma.stampInventoryEntry.findFirst({
    where: { id: stampId, userId },
    include: {
      postalEntity: true,
      namedFaceValue: true,
      namedFaceValueProposal: true,
    },
  });
  if (!stamp) {
    throw new StampNotFoundError();
  }

  const { actionResolution, ...updates } = input;
  const referenceUpdates: {
    actionRequired?: boolean;
    namedFaceValueId?: string | null;
    namedFaceValueProposalId?: string | null;
  } = {};
  if (actionResolution) {
    if (!stamp.actionRequired) {
      throw new StampActionError("This stamp does not require a replacement.");
    }
    if (actionResolution.type === "FALLBACK") {
      const candidate = await presentStampRecord(
        { ...stamp, ...updates, actionRequired: false },
        activeCountry,
      );
      if (
        !candidate.unitPostageValue ||
        ["EXPIRED", "OUTSIDE_ACTIVE_COUNTRY"].includes(
          candidate.unitPostageValue.source,
        )
      ) {
        throw new StampActionError(
          "No approved or manual fallback is available for this stamp.",
        );
      }
      referenceUpdates.actionRequired = false;
    } else if (stamp.faceValueType !== "NAMED") {
      throw new StampActionError(
        "Only a named/code stamp can use a named/code replacement.",
      );
    } else if (actionResolution.referenceType === "approved") {
      const replacement = await prisma.namedFaceValue.findUnique({
        where: {
          id_countryCode: {
            id: actionResolution.id,
            countryCode: stamp.countryCode,
          },
        },
        select: { id: true },
      });
      if (!replacement) {
        throw new StampActionError("Select an eligible replacement.");
      }
      Object.assign(referenceUpdates, {
        actionRequired: false,
        namedFaceValueId: replacement.id,
        namedFaceValueProposalId: null,
      });
    } else {
      const replacement = await prisma.namedFaceValueDefinitionProposal.findFirst({
        where: {
          id: actionResolution.id,
          countryCode: stamp.countryCode,
          submittedById: userId,
          status: "PENDING",
        },
        select: { id: true },
      });
      if (!replacement) {
        throw new StampActionError("Select an eligible replacement.");
      }
      Object.assign(referenceUpdates, {
        actionRequired: false,
        namedFaceValueId: null,
        namedFaceValueProposalId: replacement.id,
      });
    }
  }

  return prisma.stampInventoryEntry.update({
    where: { id: stampId },
    data: { ...updates, ...referenceUpdates },
    include: {
      postalEntity: true,
      namedFaceValue: true,
      namedFaceValueProposal: true,
    },
  });
}

export async function deleteStamp(userId: string, stampId: string) {
  const result = await prisma.stampInventoryEntry.deleteMany({
    where: { id: stampId, userId },
  });
  if (result.count === 0) {
    throw new StampNotFoundError();
  }
}

export async function presentStamp(
  stamp: StampWithPostalEntity,
  activeCountry: ActiveCountry,
) {
  return presentStampRecord(stamp, activeCountry);
}
