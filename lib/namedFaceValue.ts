import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/db";

export type NamedFaceValueResolution =
  | {
      status: "RESOLVED";
      namedFaceValueId: string;
      displayCode: string;
      amount: Prisma.Decimal;
      currencyCode: string;
    }
  | {
      status: "UNRESOLVED";
      reason: "MISSING_NAMED_FACE_VALUE" | "MISSING_SCHEDULE_VALUE";
      countryCode: string;
      normalizedCode: string;
    };

export function normalizeCountryCode(countryCode: string): string {
  return countryCode.normalize("NFKC").trim().toUpperCase();
}

export function normalizeNamedFaceValueCode(code: string): string {
  return code.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();
}

export async function resolveNamedFaceValue(
  countryCode: string,
  code: string,
): Promise<NamedFaceValueResolution> {
  const normalizedCountryCode = normalizeCountryCode(countryCode);
  const normalizedCode = normalizeNamedFaceValueCode(code);
  const namedFaceValue = await prisma.namedFaceValue.findUnique({
    where: {
      countryCode_normalizedCode: {
        countryCode: normalizedCountryCode,
        normalizedCode,
      },
    },
    include: {
      valueSchedule: { include: { currentValue: true } },
    },
  });

  if (!namedFaceValue) {
    return {
      status: "UNRESOLVED",
      reason: "MISSING_NAMED_FACE_VALUE",
      countryCode: normalizedCountryCode,
      normalizedCode,
    };
  }

  if (!namedFaceValue.valueSchedule.currentValue) {
    return {
      status: "UNRESOLVED",
      reason: "MISSING_SCHEDULE_VALUE",
      countryCode: normalizedCountryCode,
      normalizedCode,
    };
  }

  return {
    status: "RESOLVED",
    namedFaceValueId: namedFaceValue.id,
    displayCode: namedFaceValue.displayCode,
    amount: new Prisma.Decimal(namedFaceValue.valueSchedule.currentValue.amount),
    currencyCode: namedFaceValue.valueSchedule.currencyCode,
  };
}
