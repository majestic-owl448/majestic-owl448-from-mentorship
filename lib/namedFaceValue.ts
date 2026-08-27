import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/db";

type ScheduledNamedFaceValueChange = {
  amount: Prisma.Decimal;
  currencyCode: string;
  effectiveOn: string;
  daysUntil: number;
};

export type NamedFaceValueResolution =
  | {
      status: "RESOLVED";
      namedFaceValueId: string;
      displayCode: string;
      amount: Prisma.Decimal;
      currencyCode: string;
      effectiveOn: string | null;
      nextChange: ScheduledNamedFaceValueChange | null;
      upcoming: ScheduledNamedFaceValueChange | null;
    }
  | {
      status: "UNRESOLVED";
      reason: "MISSING_NAMED_FACE_VALUE";
      countryCode: string;
      normalizedCode: string;
    }
  | {
      status: "UNRESOLVED";
      reason: "MISSING_SCHEDULE_VALUE";
      countryCode: string;
      normalizedCode: string;
      nextChange: ScheduledNamedFaceValueChange | null;
      upcoming: ScheduledNamedFaceValueChange | null;
    };

export function normalizeCountryCode(countryCode: string): string {
  return countryCode.normalize("NFKC").trim().toUpperCase();
}

export function normalizeNamedFaceValueCode(code: string): string {
  return code.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();
}

function calendarDateMilliseconds(value: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new RangeError(`Invalid calendar date: ${value}`);
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(0);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCFullYear(year, month - 1, day);
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new RangeError(`Invalid calendar date: ${value}`);
  }

  return date.getTime();
}

export async function resolveNamedFaceValue(
  countryCode: string,
  code: string,
  localDate: string,
): Promise<NamedFaceValueResolution> {
  const localDateMilliseconds = calendarDateMilliseconds(localDate);
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
      valueSchedule: { include: { values: true } },
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

  const datedValues = namedFaceValue.valueSchedule.values.map((value) => ({
    ...value,
    effectiveMilliseconds:
      value.effectiveOn === null
        ? Number.NEGATIVE_INFINITY
        : calendarDateMilliseconds(value.effectiveOn),
  }));
  const currentValue = datedValues
    .filter((value) => value.effectiveMilliseconds <= localDateMilliseconds)
    .sort(
      (left, right) =>
        right.effectiveMilliseconds - left.effectiveMilliseconds,
    )[0];

  const nextValue = datedValues
    .filter((value) => value.effectiveMilliseconds > localDateMilliseconds)
    .sort(
      (left, right) =>
        left.effectiveMilliseconds - right.effectiveMilliseconds,
    )[0];
  const daysUntil = nextValue
    ? (nextValue.effectiveMilliseconds - localDateMilliseconds) / 86_400_000
    : null;
  const nextChange =
    nextValue && daysUntil !== null
      ? {
          amount: new Prisma.Decimal(nextValue.amount),
          currencyCode: namedFaceValue.valueSchedule.currencyCode,
          effectiveOn: nextValue.effectiveOn as string,
          daysUntil,
        }
      : null;
  const upcoming = nextChange && nextChange.daysUntil <= 10 ? nextChange : null;

  if (!currentValue) {
    return {
      status: "UNRESOLVED",
      reason: "MISSING_SCHEDULE_VALUE",
      countryCode: normalizedCountryCode,
      normalizedCode,
      nextChange,
      upcoming,
    };
  }

  return {
    status: "RESOLVED",
    namedFaceValueId: namedFaceValue.id,
    displayCode: namedFaceValue.displayCode,
    amount: new Prisma.Decimal(currentValue.amount),
    currencyCode: namedFaceValue.valueSchedule.currencyCode,
    effectiveOn: currentValue.effectiveOn,
    nextChange,
    upcoming,
  };
}
