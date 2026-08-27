import type { StampInventoryEntry } from "@/lib/generated/prisma/client";
import { Prisma } from "@/lib/generated/prisma/client";
import { resolveCurrencyConversion } from "@/lib/currencyConversion";
import { prisma } from "@/lib/db";
import type { NewMonetaryStampInput } from "@/lib/stampValidation";

type ActiveCountry = {
  displayCurrencyCode: string;
  postalEntity: { countryCode: string };
};

type ResolvedValue = {
  amount: string;
  currencyCode: string;
  source:
    | "FACE_AMOUNT"
    | "FIXED_CONVERSION"
    | "MANUAL_FALLBACK"
    | "EXPIRED"
    | "OUTSIDE_ACTIVE_COUNTRY";
};

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

  const conversion = await resolveCurrencyConversion(
    stamp.faceAmount,
    stamp.faceCurrencyCode,
    activeCountry.displayCurrencyCode,
  );
  if (conversion.status === "RESOLVED") {
    return {
      amount: conversion.amount.toString(),
      currencyCode: conversion.currencyCode,
      source:
        conversion.source === "IDENTITY" ? "FACE_AMOUNT" : "FIXED_CONVERSION",
    };
  }

  if (stamp.manualPostageAmount && stamp.manualPostageCurrencyCode) {
    const fallbackConversion = await resolveCurrencyConversion(
      stamp.manualPostageAmount,
      stamp.manualPostageCurrencyCode,
      activeCountry.displayCurrencyCode,
    );
    if (fallbackConversion.status === "RESOLVED") {
      return {
        amount: fallbackConversion.amount.toString(),
        currencyCode: fallbackConversion.currencyCode,
        source: "MANUAL_FALLBACK",
      };
    }
  }

  return null;
}

async function presentStamp(
  stamp: StampInventoryEntry,
  activeCountry: ActiveCountry,
) {
  const unitPostageValue = await resolveUnitPostageValue(stamp, activeCountry);
  const usableQuantity = stamp.quantityOwned - stamp.quantityAnnulled;
  const totalPostageValue = unitPostageValue
    ? {
        amount: new Prisma.Decimal(unitPostageValue.amount)
          .mul(usableQuantity)
          .toString(),
        currencyCode: unitPostageValue.currencyCode,
      }
    : null;

  return {
    id: stamp.id,
    countryCode: stamp.countryCode,
    name: stamp.name,
    yearOfIssue: stamp.yearOfIssue,
    faceAmount: stamp.faceAmount,
    faceCurrencyCode: stamp.faceCurrencyCode,
    manualPostageAmount: stamp.manualPostageAmount,
    manualPostageCurrencyCode: stamp.manualPostageCurrencyCode,
    quantityOwned: stamp.quantityOwned,
    quantityAnnulled: stamp.quantityAnnulled,
    usableQuantity,
    expired: stamp.expired,
    unitPostageValue,
    totalPostageValue,
    createdAt: stamp.createdAt.toISOString(),
    updatedAt: stamp.updatedAt.toISOString(),
  };
}

export async function createMonetaryStamp(
  userId: string,
  input: NewMonetaryStampInput,
) {
  return prisma.stampInventoryEntry.create({
    data: { userId, ...input },
  });
}

export async function listMonetaryStamps(
  userId: string,
  activeCountry: ActiveCountry,
) {
  const stamps = await prisma.stampInventoryEntry.findMany({
    where: { userId },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });

  return Promise.all(stamps.map((stamp) => presentStamp(stamp, activeCountry)));
}

export async function presentMonetaryStamp(
  stamp: StampInventoryEntry,
  activeCountry: ActiveCountry,
) {
  return presentStamp(stamp, activeCountry);
}
