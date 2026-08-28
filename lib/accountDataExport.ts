import type { User } from "supertokens-node";
import { prisma } from "@/lib/db";

export const ACCOUNT_EXPORT_SCHEMA_VERSION = 1;

export const USER_LINKED_MODEL_POLICY = {
  UserProfile: {
    exportedFields: [
      "id",
      "email",
      "role",
      "activePostalEntitySettingId",
      "deletingAt",
      "createdAt",
      "updatedAt",
    ],
    secretFields: [],
  },
  StampInventoryEntry: {
    exportedFields: [
      "id",
      "userId",
      "countryCode",
      "postalEntityId",
      "name",
      "yearOfIssue",
      "faceValueType",
      "faceAmount",
      "faceCurrencyCode",
      "namedFaceValueId",
      "namedFaceValueProposalId",
      "manualPostageAmount",
      "manualPostageCurrencyCode",
      "quantityOwned",
      "quantityAnnulled",
      "expired",
      "createdAt",
      "updatedAt",
    ],
    secretFields: [],
  },
  UserPostalEntitySetting: {
    exportedFields: [
      "id",
      "userId",
      "postalEntityId",
      "displayCurrencyCode",
      "timeZone",
      "timeZoneMode",
      "createdAt",
      "updatedAt",
    ],
    secretFields: [],
  },
  PostalEntity: {
    exportedFields: [
      "id",
      "name",
      "normalizedName",
      "countryCode",
      "issuingAuthority",
      "scope",
      "sourceUrl",
      "sourceNote",
      "submittedName",
      "submittedNormalizedName",
      "submittedCountryCode",
      "submittedIssuingAuthority",
      "submittedScope",
      "submittedSourceUrl",
      "submittedSourceNote",
      "status",
      "submittedById",
      "moderatedById",
      "decidedAt",
      "decisionNote",
      "mergedIntoId",
      "createdAt",
      "updatedAt",
    ],
    secretFields: [],
    redactedWhenForeign: ["submittedById", "moderatedById"],
  },
  NamedFaceValueDefinitionProposal: {
    exportedFields: [
      "id",
      "submittedById",
      "targetNamedFaceValueId",
      "approvedNamedFaceValueId",
      "countryCode",
      "displayCode",
      "normalizedCode",
      "currencyCode",
      "sourceUrl",
      "sourceNote",
      "status",
      "moderatedById",
      "decidedAt",
      "decisionNote",
      "createdAt",
    ],
    secretFields: [],
    redactedWhenForeign: ["submittedById", "moderatedById"],
  },
  NamedFaceValueValueProposal: {
    exportedFields: [
      "id",
      "submittedById",
      "namedFaceValueId",
      "definitionProposalId",
      "mergedValueScheduleValueId",
      "amount",
      "effectiveOn",
      "eligibleOn",
      "sourceUrl",
      "sourceNote",
      "status",
      "moderatedById",
      "decidedAt",
      "decisionNote",
      "actionRequired",
      "createdAt",
    ],
    secretFields: [],
    redactedWhenForeign: ["submittedById", "moderatedById"],
  },
  CurrencyConversionProposal: {
    exportedFields: [
      "id",
      "submittedById",
      "targetCurrencyConversionId",
      "fromCurrencyCode",
      "toCurrencyCode",
      "multiplier",
      "sourceUrl",
      "sourceNote",
      "status",
      "moderatedById",
      "decidedAt",
      "decisionNote",
      "createdAt",
    ],
    secretFields: [],
    redactedWhenForeign: ["submittedById", "moderatedById"],
  },
  AccountDeletionJob: {
    exportedFields: [],
    secretFields: [
      "userId",
      "status",
      "attemptCount",
      "lastError",
      "createdAt",
      "updatedAt",
    ],
  },
  DeletedAccountTombstone: {
    exportedFields: [],
    secretFields: ["userIdHash", "createdAt"],
  },
} as const;

type ScalarRecord = Record<string, unknown>;

function serializeRecord<T extends ScalarRecord>(record: T) {
  return Object.fromEntries(
    Object.entries(record).map(([key, value]) => [
      key,
      value instanceof Date ? value.toISOString() : value,
    ]),
  );
}

function serializeRecords<T extends ScalarRecord>(records: T[]) {
  return records.map(serializeRecord);
}

function serializeUserLinkedRecord(
  modelName: keyof typeof USER_LINKED_MODEL_POLICY,
  record: ScalarRecord,
) {
  return Object.fromEntries(
    USER_LINKED_MODEL_POLICY[modelName].exportedFields.map((field) => {
      const value = record[field];
      return [field, value instanceof Date ? value.toISOString() : value];
    }),
  );
}

function unique(values: (string | null | undefined)[]) {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

function accountMetadata(user: User | undefined) {
  if (!user) return null;

  return {
    id: user.id,
    timeJoined: new Date(user.timeJoined).toISOString(),
    isPrimaryUser: user.isPrimaryUser,
    tenantIds: user.tenantIds,
    emails: user.emails,
    phoneNumbers: user.phoneNumbers,
    thirdParty: user.thirdParty.map(({ id, userId }) => ({ id, userId })),
    loginMethods: user.loginMethods.map((method) => ({
      recipeId: method.recipeId,
      tenantIds: method.tenantIds,
      email: method.email ?? null,
      phoneNumber: method.phoneNumber ?? null,
      thirdParty: method.thirdParty
        ? { id: method.thirdParty.id, userId: method.thirdParty.userId }
        : null,
      verified: method.verified,
      timeJoined: new Date(method.timeJoined).toISOString(),
    })),
  };
}

export async function createAccountDataExport(
  userId: string,
  superTokensUser: User | undefined,
  generatedAt = new Date(),
) {
  const [profile, settings, inventory, postalEntities, definitions, values, conversions] =
    await Promise.all([
      prisma.userProfile.findUniqueOrThrow({ where: { id: userId } }),
      prisma.userPostalEntitySetting.findMany({
        where: { userId },
        orderBy: { id: "asc" },
      }),
      prisma.stampInventoryEntry.findMany({
        where: { userId },
        orderBy: { id: "asc" },
      }),
      prisma.postalEntity.findMany({
        where: { OR: [{ submittedById: userId }, { moderatedById: userId }] },
        orderBy: { id: "asc" },
      }),
      prisma.namedFaceValueDefinitionProposal.findMany({
        where: { OR: [{ submittedById: userId }, { moderatedById: userId }] },
        orderBy: { id: "asc" },
      }),
      prisma.namedFaceValueValueProposal.findMany({
        where: { OR: [{ submittedById: userId }, { moderatedById: userId }] },
        orderBy: { id: "asc" },
      }),
      prisma.currencyConversionProposal.findMany({
        where: { OR: [{ submittedById: userId }, { moderatedById: userId }] },
        orderBy: { id: "asc" },
      }),
    ]);

  const proposalActions = await prisma.stampProposalAction.findMany({
    where: { stamp: { userId } },
    orderBy: { id: "asc" },
  });

  const referencedDefinitionProposals =
    await prisma.namedFaceValueDefinitionProposal.findMany({
      where: {
        id: { in: unique(values.map((proposal) => proposal.definitionProposalId)) },
      },
      select: {
        targetNamedFaceValueId: true,
        approvedNamedFaceValueId: true,
      },
    });

  const namedFaceValueIds = unique([
    ...inventory.map((entry) => entry.namedFaceValueId),
    ...definitions.flatMap((proposal) => [
      proposal.targetNamedFaceValueId,
      proposal.approvedNamedFaceValueId,
    ]),
    ...values.map((proposal) => proposal.namedFaceValueId),
    ...referencedDefinitionProposals.flatMap((proposal) => [
      proposal.targetNamedFaceValueId,
      proposal.approvedNamedFaceValueId,
    ]),
  ]);
  const namedFaceValues = await prisma.namedFaceValue.findMany({
    where: { id: { in: namedFaceValueIds } },
    orderBy: { id: "asc" },
  });

  const valueScheduleIds = unique(namedFaceValues.map((value) => value.valueScheduleId));
  const valueSchedules = await prisma.valueSchedule.findMany({
    where: { id: { in: valueScheduleIds } },
    orderBy: { id: "asc" },
  });
  const valueScheduleValues = await prisma.valueScheduleValue.findMany({
    where: {
      OR: [
        { valueScheduleId: { in: valueScheduleIds } },
        { id: { in: unique(values.map((proposal) => proposal.mergedValueScheduleValueId)) } },
      ],
    },
    orderBy: { id: "asc" },
  });

  const linkedPostalEntityIds = unique([
    profile.activePostalEntitySettingId
      ? settings.find((setting) => setting.id === profile.activePostalEntitySettingId)
          ?.postalEntityId
      : null,
    ...settings.map((setting) => setting.postalEntityId),
    ...inventory.map((entry) => entry.postalEntityId),
    ...postalEntities.map((entity) => entity.id),
    ...postalEntities.map((entity) => entity.mergedIntoId),
  ]);
  const linkedPostalEntities = await prisma.postalEntity.findMany({
    where: { id: { in: linkedPostalEntityIds } },
    orderBy: { id: "asc" },
  });

  const linkedConversionIds = unique(
    conversions.map((proposal) => proposal.targetCurrencyConversionId),
  );
  const contributedConversionPairs = conversions.map((proposal) => ({
    fromCurrencyCode: proposal.fromCurrencyCode,
    toCurrencyCode: proposal.toCurrencyCode,
  }));
  const valuationSourceCurrencyCodes = unique([
    ...inventory.flatMap((entry) => [
      entry.faceCurrencyCode,
      entry.manualPostageCurrencyCode,
    ]),
    ...valueSchedules.map((schedule) => schedule.currencyCode),
  ]);
  const displayCurrencyCodes = unique(
    settings.map((setting) => setting.displayCurrencyCode),
  );
  const linkedConversions = await prisma.currencyConversion.findMany({
    where: {
      OR: [
        { id: { in: linkedConversionIds } },
        ...contributedConversionPairs,
        {
          fromCurrencyCode: { in: valuationSourceCurrencyCodes },
          toCurrencyCode: { in: displayCurrencyCodes },
        },
      ],
    },
    orderBy: { id: "asc" },
  });

  const currencyCodes = unique([
    ...settings.map((setting) => setting.displayCurrencyCode),
    ...inventory.flatMap((entry) => [
      entry.faceCurrencyCode,
      entry.manualPostageCurrencyCode,
    ]),
    ...definitions.map((proposal) => proposal.currencyCode),
    ...conversions.flatMap((proposal) => [
      proposal.fromCurrencyCode,
      proposal.toCurrencyCode,
    ]),
    ...valueSchedules.map((schedule) => schedule.currencyCode),
    ...linkedConversions.flatMap((conversion) => [
      conversion.fromCurrencyCode,
      conversion.toCurrencyCode,
    ]),
  ]);
  const currencies = await prisma.currency.findMany({
    where: { code: { in: currencyCodes } },
    orderBy: { code: "asc" },
  });

  const withAccountLinks = <
    T extends { submittedById?: string | null; moderatedById?: string | null },
  >(
    modelName:
      | "PostalEntity"
      | "NamedFaceValueDefinitionProposal"
      | "NamedFaceValueValueProposal"
      | "CurrencyConversionProposal",
    record: T,
  ) => ({
    ...serializeUserLinkedRecord(modelName, record),
    ...(record.submittedById && record.submittedById !== userId
      ? { submittedById: null }
      : {}),
    ...(record.moderatedById && record.moderatedById !== userId
      ? { moderatedById: null }
      : {}),
    accountLinks: [
      ...(record.submittedById === userId ? ["SUBMITTED"] : []),
      ...(record.moderatedById === userId ? ["MODERATED"] : []),
    ],
  });

  return {
    schemaVersion: ACCOUNT_EXPORT_SCHEMA_VERSION,
    generatedAt: generatedAt.toISOString(),
    account: {
      superTokens: accountMetadata(superTokensUser),
      profile: serializeUserLinkedRecord("UserProfile", profile),
    },
    privateData: {
      postalEntitySettings: settings.map((setting) =>
        serializeUserLinkedRecord("UserPostalEntitySetting", setting),
      ),
      stampInventory: inventory.map((entry) =>
        serializeUserLinkedRecord("StampInventoryEntry", entry),
      ),
      stampProposalActions: serializeRecords(proposalActions),
    },
    proposalsAndModeration: {
      postalEntities: postalEntities.map((entity) =>
        withAccountLinks("PostalEntity", entity),
      ),
      namedFaceValueDefinitions: definitions.map((proposal) =>
        withAccountLinks("NamedFaceValueDefinitionProposal", proposal),
      ),
      namedFaceValueValues: values.map((proposal) =>
        withAccountLinks("NamedFaceValueValueProposal", proposal),
      ),
      currencyConversions: conversions.map((proposal) =>
        withAccountLinks("CurrencyConversionProposal", proposal),
      ),
    },
    linkedSharedData: {
      postalEntities: linkedPostalEntities.map((entity) =>
        withAccountLinks("PostalEntity", entity),
      ),
      namedFaceValues: serializeRecords(namedFaceValues),
      valueSchedules: serializeRecords(valueSchedules),
      valueScheduleValues: serializeRecords(valueScheduleValues),
      currencyConversions: serializeRecords(linkedConversions),
      currencies: serializeRecords(currencies),
    },
  };
}
