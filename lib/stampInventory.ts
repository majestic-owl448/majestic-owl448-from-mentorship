import type { StampInventoryEntry } from "@/lib/generated/prisma/client";
import { Prisma } from "@/lib/generated/prisma/client";
import { resolveCurrencyConversion } from "@/lib/currencyConversion";
import { prisma } from "@/lib/db";
import { addExactDecimals, multiplyExactDecimals } from "@/lib/decimal";
import { resolveNamedFaceValueById } from "@/lib/namedFaceValue";
import { localDateInTimeZone } from "@/lib/postalEntitySettings";
import type { NewStampInput } from "@/lib/stampValidation";

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
    | "NAMED_SCHEDULE"
    | "MANUAL_FALLBACK"
    | "EXPIRED"
    | "OUTSIDE_ACTIVE_COUNTRY";
};

type StampWithPostalEntity = Prisma.StampInventoryEntryGetPayload<{
  include: { postalEntity: true; namedFaceValue: true };
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

async function resolveUnitPostageValue(
  stamp: StampInventoryEntry,
  activeCountry: ActiveCountry,
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
    );
    if (conversion.status === "RESOLVED") {
      return {
        amount: conversion.amount.toFixed(),
        currencyCode: conversion.currencyCode,
        source:
          conversion.source === "IDENTITY"
            ? "FACE_AMOUNT"
            : "FIXED_CONVERSION",
      };
    }
  }

  if (stamp.faceValueType === "NAMED" && stamp.namedFaceValueId) {
    const namedValue = await resolveNamedFaceValueById(
      stamp.namedFaceValueId,
      stamp.countryCode,
      localDateInTimeZone(activeCountry.timeZone),
    );
    if (namedValue.status === "RESOLVED") {
      const conversion = await resolveCurrencyConversion(
        namedValue.amount.toFixed(),
        namedValue.currencyCode,
        activeCountry.displayCurrencyCode,
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
  const unitPostageValue = await resolveUnitPostageValue(stamp, activeCountry);
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
    namedFaceValue: stamp.namedFaceValue
      ? {
          id: stamp.namedFaceValue.id,
          countryCode: stamp.namedFaceValue.countryCode,
          displayCode: stamp.namedFaceValue.displayCode,
        }
      : null,
    manualPostageAmount: stamp.manualPostageAmount,
    manualPostageCurrencyCode: stamp.manualPostageCurrencyCode,
    quantityOwned: stamp.quantityOwned,
    quantityAnnulled: stamp.quantityAnnulled,
    usableQuantity,
    expired: stamp.expired,
    unitPostageValue,
    totalPostageValue,
    valuation: unitPostageValue
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
    const availableNamedFaceValue = await prisma.namedFaceValue.findUnique({
      where: {
        id_countryCode: {
          id: input.namedFaceValueId as string,
          countryCode: input.countryCode,
        },
      },
      select: { id: true },
    });
    if (!availableNamedFaceValue) {
      throw new StampNamedFaceValueError();
    }
  }

  return prisma.stampInventoryEntry.create({
    data: { userId, ...input },
    include: { postalEntity: true, namedFaceValue: true },
  });
}

export async function listStamps(
  userId: string,
  activeCountry: ActiveCountry,
) {
  const stamps = await prisma.stampInventoryEntry.findMany({
    where: { userId },
    include: { postalEntity: true, namedFaceValue: true },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });

  return Promise.all(
    stamps.map((stamp) => presentStampRecord(stamp, activeCountry)),
  );
}

export async function presentStamp(
  stamp: StampWithPostalEntity,
  activeCountry: ActiveCountry,
) {
  return presentStampRecord(stamp, activeCountry);
}
