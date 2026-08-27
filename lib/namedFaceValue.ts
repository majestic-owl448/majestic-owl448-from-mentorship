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

export async function searchNamedFaceValues(
  countryCode: string,
  query: string,
  userId?: string,
) {
  const normalizedCountryCode = normalizeCountryCode(countryCode);
  const normalizedQuery = normalizeNamedFaceValueCode(query);

  const [approved, pending] = await Promise.all([
    prisma.namedFaceValue.findMany({
      where: {
        countryCode: normalizedCountryCode,
        normalizedCode: { contains: normalizedQuery },
      },
      select: { id: true, countryCode: true, displayCode: true },
      orderBy: [{ normalizedCode: "asc" }, { id: "asc" }],
      take: 20,
    }),
    userId
      ? prisma.namedFaceValueDefinitionProposal.findMany({
          where: {
            submittedById: userId,
            status: "PENDING",
            countryCode: normalizedCountryCode,
            normalizedCode: { contains: normalizedQuery },
          },
          select: {
            id: true,
            countryCode: true,
            displayCode: true,
            status: true,
          },
          orderBy: [{ normalizedCode: "asc" }, { id: "asc" }],
          take: 20,
        })
      : [],
  ]);

  return [
    ...approved,
    ...pending.map((proposal) => ({
      id: proposal.id,
      countryCode: proposal.countryCode,
      displayCode: proposal.displayCode,
      namedFaceValueProposalId: proposal.id,
      proposalStatus: proposal.status,
    })),
  ];
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

type SchedulableNamedFaceValue = {
  id: string;
  countryCode: string;
  displayCode: string;
  normalizedCode: string;
  currencyCode: string;
  values: Array<{
    id: string;
    amount: string;
    effectiveOn: string | null;
    eligibleOn: string | null;
    pending: boolean;
    createdAt: Date;
  }>;
};

function resolveNamedFaceValueSchedule(
  namedFaceValue: SchedulableNamedFaceValue,
  localDate: string,
): NamedFaceValueResolution {
  const localDateMilliseconds = calendarDateMilliseconds(localDate);
  const datedValues = namedFaceValue.values.map((value) => ({
    ...value,
    effectiveMilliseconds:
      value.eligibleOn === null
        ? Number.NEGATIVE_INFINITY
        : calendarDateMilliseconds(value.eligibleOn),
  }));
  const precedence = (
    left: (typeof datedValues)[number],
    right: (typeof datedValues)[number],
  ) =>
    right.effectiveMilliseconds - left.effectiveMilliseconds ||
    Number(right.pending) - Number(left.pending) ||
    right.createdAt.getTime() - left.createdAt.getTime() ||
    right.id.localeCompare(left.id);
  const currentValue = datedValues
    .filter((value) => value.effectiveMilliseconds <= localDateMilliseconds)
    .sort(precedence)[0];

  const nextValue = datedValues
    .filter(
      (value) =>
        value.effectiveOn !== null &&
        value.effectiveMilliseconds > localDateMilliseconds,
    )
    .sort(
      (left, right) =>
        left.effectiveMilliseconds - right.effectiveMilliseconds ||
        Number(right.pending) - Number(left.pending) ||
        right.createdAt.getTime() - left.createdAt.getTime() ||
        right.id.localeCompare(left.id),
    )[0];
  const daysUntil = nextValue
    ? (nextValue.effectiveMilliseconds - localDateMilliseconds) / 86_400_000
    : null;
  const nextChange =
    nextValue && daysUntil !== null
      ? {
          amount: new Prisma.Decimal(nextValue.amount),
          currencyCode: namedFaceValue.currencyCode,
          effectiveOn: nextValue.effectiveOn as string,
          daysUntil,
        }
      : null;
  const upcoming = nextChange && nextChange.daysUntil <= 10 ? nextChange : null;

  if (!currentValue) {
    return {
      status: "UNRESOLVED",
      reason: "MISSING_SCHEDULE_VALUE",
      countryCode: namedFaceValue.countryCode,
      normalizedCode: namedFaceValue.normalizedCode,
      nextChange,
      upcoming,
    };
  }

  return {
    status: "RESOLVED",
    namedFaceValueId: namedFaceValue.id,
    displayCode: namedFaceValue.displayCode,
    amount: new Prisma.Decimal(currentValue.amount),
    currencyCode: namedFaceValue.currencyCode,
    effectiveOn: currentValue.effectiveOn,
    nextChange,
    upcoming,
  };
}

export async function resolveNamedFaceValue(
  countryCode: string,
  code: string,
  localDate: string,
  userId?: string,
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
    include: { valueSchedule: { include: { values: true } } },
  });

  if (!namedFaceValue) {
    return {
      status: "UNRESOLVED",
      reason: "MISSING_NAMED_FACE_VALUE",
      countryCode: normalizedCountryCode,
      normalizedCode,
    };
  }

  return resolveNamedFaceValueSchedule(
    await schedulableApprovedDefinition(namedFaceValue, userId),
    localDate,
  );
}

export async function resolveNamedFaceValueById(
  namedFaceValueId: string,
  countryCode: string,
  localDate: string,
  userId?: string,
): Promise<NamedFaceValueResolution> {
  const normalizedCountryCode = normalizeCountryCode(countryCode);
  const namedFaceValue = await prisma.namedFaceValue.findUnique({
    where: {
      id_countryCode: {
        id: namedFaceValueId,
        countryCode: normalizedCountryCode,
      },
    },
    include: { valueSchedule: { include: { values: true } } },
  });

  if (!namedFaceValue) {
    return {
      status: "UNRESOLVED",
      reason: "MISSING_NAMED_FACE_VALUE",
      countryCode: normalizedCountryCode,
      normalizedCode: "",
    };
  }

  return resolveNamedFaceValueSchedule(
    await schedulableApprovedDefinition(namedFaceValue, userId),
    localDate,
  );
}

type ApprovedDefinition = Prisma.NamedFaceValueGetPayload<{
  include: { valueSchedule: { include: { values: true } } };
}>;

async function pendingValues(
  userId: string | undefined,
  namedFaceValueId: string | null,
  definitionProposalId: string | null,
) {
  if (!userId) {
    return [];
  }

  return prisma.namedFaceValueValueProposal.findMany({
    where: {
      submittedById: userId,
      status: "PENDING",
      OR: [
        ...(namedFaceValueId ? [{ namedFaceValueId }] : []),
        ...(definitionProposalId ? [{ definitionProposalId }] : []),
      ],
    },
    select: {
      id: true,
      amount: true,
      effectiveOn: true,
      eligibleOn: true,
      createdAt: true,
    },
  });
}

async function schedulableApprovedDefinition(
  definition: ApprovedDefinition,
  userId?: string,
): Promise<SchedulableNamedFaceValue> {
  const proposals = await pendingValues(userId, definition.id, null);
  return {
    id: definition.id,
    countryCode: definition.countryCode,
    displayCode: definition.displayCode,
    normalizedCode: definition.normalizedCode,
    currencyCode: definition.valueSchedule.currencyCode,
    values: [
      ...definition.valueSchedule.values.map((value) => ({
        ...value,
        eligibleOn: value.effectiveOn,
        pending: false,
      })),
      ...proposals.map((value) => ({ ...value, pending: true })),
    ],
  };
}

export async function resolveNamedFaceValueProposalById(
  proposalId: string,
  countryCode: string,
  localDate: string,
  userId: string,
): Promise<NamedFaceValueResolution> {
  const normalizedCountryCode = normalizeCountryCode(countryCode);
  const proposal = await prisma.namedFaceValueDefinitionProposal.findFirst({
    where: {
      id: proposalId,
      countryCode: normalizedCountryCode,
      submittedById: userId,
      status: "PENDING",
    },
    include: {
      targetNamedFaceValue: {
        include: { valueSchedule: { include: { values: true } } },
      },
    },
  });
  if (!proposal) {
    return {
      status: "UNRESOLVED",
      reason: "MISSING_NAMED_FACE_VALUE",
      countryCode: normalizedCountryCode,
      normalizedCode: "",
    };
  }

  const proposals = await pendingValues(
    userId,
    proposal.targetNamedFaceValueId,
    proposal.id,
  );
  const approvedValues =
    proposal.targetNamedFaceValue?.valueSchedule.values ?? [];
  return resolveNamedFaceValueSchedule(
    {
      id: proposal.id,
      countryCode: proposal.countryCode,
      displayCode: proposal.displayCode,
      normalizedCode: proposal.normalizedCode,
      currencyCode: proposal.currencyCode,
      values: [
        ...approvedValues.map((value) => ({
          ...value,
          eligibleOn: value.effectiveOn,
          pending: false,
        })),
        ...proposals.map((value) => ({ ...value, pending: true })),
      ],
    },
    localDate,
  );
}
